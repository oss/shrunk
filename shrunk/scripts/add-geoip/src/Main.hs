module Main where
import Control.Monad (when)
import Control.Parallel.Strategies (withStrategy, parBuffer, rseq)
import Data.Bson (Document, ObjectId, (=:), (!?))
import Data.GeoIP2 (GeoDB, GeoResult(..), openGeoDB, findGeoData)
import Data.IP (IP)
import Data.Maybe (catMaybes, listToMaybe)
import Data.Text (Text)
import Database.MongoDB ( Query(..), UpdateOption(..), Action, WriteResult, AccessMode(..)
                        , connect, access, find, updateMany, rest, host, close, select )
import System.Environment (getArgs, getProgName)
import System.Exit (exitFailure)

data GeoIPData = GeoIPData { docId       :: ObjectId
                           , stateCode   :: Maybe Text
                           , countryCode :: Maybe Text
                           } deriving Show

main :: IO ()
main = do
  args <- getArgs
  when (length args /= 2) $ usage >> exitFailure
  conn <- connect . host $ args !! 0
  let run = access conn UnconfirmedWrites "shrunk"
  visits <- run getVisits
  geodb <- openGeoDB $ args !! 1
  writeResult <- run . updateDocuments $ getAllGeoIPData geodb visits
  print writeResult
  close conn

usage :: IO ()
usage = do
  progName <- getProgName
  putStrLn $ "usage: " ++ progName ++ " [db host] [geodb path]"

getVisits :: Action IO [Document]
getVisits = find (select [] "visits") {project = ["_id" =: 1, "source_ip" =: 1]} >>= rest

getGeoIPData :: GeoDB -> Document -> Maybe GeoIPData
getGeoIPData db doc = do
  docId     <- doc !? "_id"
  sourceIp  <- doc !? "source_ip"
  geoResult <- either (const Nothing) Just $ findGeoData db "en" (read sourceIp :: IP)
  return GeoIPData { docId
                   , stateCode   = fst <$> listToMaybe (geoSubdivisions geoResult)
                   , countryCode = geoCountryISO geoResult
                   }

getAllGeoIPData :: GeoDB -> [Document] -> [GeoIPData]
getAllGeoIPData db = catMaybes . withStrategy (parBuffer 1000 rseq) . map (getGeoIPData db)

updateDocuments :: [GeoIPData] -> Action IO WriteResult
updateDocuments = updateMany "visits" . map mkUpdate
  where mkUpdate GeoIPData { .. } = ( ["_id" =: docId]
                                    , ["$set" =: [ "state_code"   =: stateCode
                                                 , "country_code" =: countryCode
                                                 ]
                                      ]
                                    , [Upsert]
                                    )
